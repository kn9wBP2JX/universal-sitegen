#!/usr/bin/env node
import * as program from 'commander'
import * as path from 'path'
import * as chalk from 'chalk'
import * as fs from 'fs'
import { generateSite } from './index'
import { CLIConfig } from './interfaces'
import { NgModuleFactory, Type } from '@angular/core'
const pjson = require('../package.json')

/**
 * takes a path to a file and returns the content async
 * @param pathToFile full path to the file to read
 */
const readFile = (pathToFile: string): Promise<string> => {
  return new Promise((res, rej) => {
    fs.readFile(pathToFile, 'utf8', (err, file) => {
      if (err) {
        rej(err)
      } else {
       res(file)
      }
    })
  })
}

/**
 * finds and parses the universal config file
 * @param config path to the config file to read
 */
const getConfig = async (config = './universal.json'): Promise<CLIConfig> => {
  const configPath = path.join(process.cwd(), config)
  let options: any = {}

  try {
    options = require(configPath)
  } catch (e) {
    console.error(e)
    process.exit(1)
  }

  return Object.assign({}, {
    indexHTMLPath: './src/index.html',
    dotHTML: false,
    outputPath: 'site'
  }, options)
}

/**
 * requires the ngModule or ngModuleFactory for the universal app
 * @param pathToModule path to the serverModule or
 *                     serverModuleFactory in the format of "./path/to/file#ExportName"
 */
const getModule = (pathToModule: string): Type<{}> | NgModuleFactory<{}> => {
  if (!pathToModule) {
    console.log(chalk.red('Must provide a path to the NgModule or Factory'))
    process.exit(1)
    return
  }

  const modulePaths = pathToModule.split('#')
  let fullPath = path.join(process.cwd(), modulePaths[0])

  try {
    const ngModule = require(require.resolve(fullPath))[modulePaths[1]]
    return ngModule
  } catch (e) {
    console.error(chalk.red(e))
    process.exit(1)
  }
}


/**
 * builds the entire site. Hooked into commander for the "build" command
 * @param config commander config
 */
const build = async (config) => {
  const configOptions = (await getConfig(config) as CLIConfig)
  const serverModule = getModule(configOptions.serverModuleOrFactoryPath)

  return generateSite(
    serverModule,
    await readFile(path.join(process.cwd(), configOptions.indexHTMLPath)),
    configOptions
  )
}

program.version(pjson.version)

program
  .command('build')
  .option(
    '-c',
    '--config [configFilePath]', 'path to the config file, defaults to ./universal.json'
  )
  .description('Build and output your angular app as a static site')
  .action((config) => build(config))


program.parse(process.argv)

